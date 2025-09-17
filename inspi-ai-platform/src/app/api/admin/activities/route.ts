/**
 * 管理员活动管理API路由
 * 处理邀请活动的创建、更新、查询等管理功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'
import { ActivityType, ActivityStatus, ActivityRules, ActivityReward } from '@/lib/invitation/types'

// GET /api/admin/activities - 获取活动列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ActivityStatus | null
    const type = searchParams.get('type') as ActivityType | null
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const filters: any = {
      pagination: { page, limit }
    }

    if (status) filters.status = status
    if (type) filters.type = type
    if (isActive !== null) filters.isActive = isActive === 'true'

    const result = await activityService.getActivities(filters)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Failed to get activities', { error })
    return NextResponse.json({
      success: false,
      error: '获取活动列表失败'
    }, { status: 500 })
  }
}

// POST /api/admin/activities - 创建新活动
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      type,
      startDate,
      endDate,
      rules,
      rewards,
      targetMetrics
    } = body

    // 验证必填字段
    if (!name || !description || !type || !startDate || !endDate || !rules || !rewards) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段'
      }, { status: 400 })
    }

    // 验证日期
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start >= end) {
      return NextResponse.json({
        success: false,
        error: '结束时间必须晚于开始时间'
      }, { status: 400 })
    }

    // 验证活动类型
    if (!Object.values(ActivityType).includes(type)) {
      return NextResponse.json({
        success: false,
        error: '无效的活动类型'
      }, { status: 400 })
    }

    // 验证奖励配置
    if (!Array.isArray(rewards) || rewards.length === 0) {
      return NextResponse.json({
        success: false,
        error: '至少需要配置一个奖励'
      }, { status: 400 })
    }

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const activity = await activityService.createActivity({
      name,
      description,
      type,
      startDate: start,
      endDate: end,
      rules: rules as ActivityRules,
      rewards: rewards as ActivityReward[],
      targetMetrics
    })

    logger.info('Activity created via API', { activityId: activity.id, name })

    return NextResponse.json({
      success: true,
      data: activity
    }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create activity', { error })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '创建活动失败'
    }, { status: 500 })
  }
}

// PUT /api/admin/activities - 更新活动
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少活动ID'
      }, { status: 400 })
    }

    // 验证日期（如果提供）
    if (updates.startDate && updates.endDate) {
      const start = new Date(updates.startDate)
      const end = new Date(updates.endDate)
      if (start >= end) {
        return NextResponse.json({
          success: false,
          error: '结束时间必须晚于开始时间'
        }, { status: 400 })
      }
      updates.startDate = start
      updates.endDate = end
    }

    // 验证状态（如果提供）
    if (updates.status && !Object.values(ActivityStatus).includes(updates.status)) {
      return NextResponse.json({
        success: false,
        error: '无效的活动状态'
      }, { status: 400 })
    }

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const activity = await activityService.updateActivity(id, updates)

    logger.info('Activity updated via API', { activityId: id, updates })

    return NextResponse.json({
      success: true,
      data: activity
    })
  } catch (error) {
    logger.error('Failed to update activity', { error })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '更新活动失败'
    }, { status: 500 })
  }
}