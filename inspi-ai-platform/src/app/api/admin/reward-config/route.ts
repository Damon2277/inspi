/**
 * 奖励配置管理API
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, ADMIN_PERMISSIONS } from '@/lib/invitation/middleware/AdminAuthMiddleware'
import { RewardConfigServiceImpl } from '@/lib/invitation/services/RewardConfigService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const rewardConfigService = new RewardConfigServiceImpl()

/**
 * 获取奖励规则列表
 */
export const GET = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const type = searchParams.get('type') || 'rules'

      let data
      switch (type) {
        case 'rules':
          data = await rewardConfigService.getRewardRules()
          break
        case 'activities':
          data = await rewardConfigService.getRewardActivities()
          break
        case 'approvals':
          data = await rewardConfigService.getPendingApprovals()
          break
        case 'statistics':
          const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          const endDate = new Date(searchParams.get('endDate') || new Date())
          data = await rewardConfigService.getRewardStatistics(startDate, endDate)
          break
        case 'trends':
          const days = parseInt(searchParams.get('days') || '30')
          data = await rewardConfigService.getRewardTrends(days)
          break
        case 'top-users':
          const limit = parseInt(searchParams.get('limit') || '10')
          data = await rewardConfigService.getTopRewardUsers(limit)
          break
        default:
          return NextResponse.json(
            { error: 'Invalid type parameter' },
            { status: 400 }
          )
      }

      return NextResponse.json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Reward config API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reward configuration data' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_VIEW]
)

/**
 * 创建奖励规则或活动
 */
export const POST = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      if (!context.hasPermission(ADMIN_PERMISSIONS.REWARD_MANAGE)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { type, ...data } = body

      let result
      switch (type) {
        case 'rule':
          result = await rewardConfigService.createRewardRule(data)
          break
        case 'activity':
          result = await rewardConfigService.createRewardActivity(data)
          break
        default:
          return NextResponse.json(
            { error: 'Invalid type parameter' },
            { status: 400 }
          )
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: `${type === 'rule' ? 'Reward rule' : 'Reward activity'} created successfully`
      })
    } catch (error) {
      console.error('Create reward config error:', error)
      return NextResponse.json(
        { error: 'Failed to create reward configuration' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_MANAGE]
)

/**
 * 更新奖励规则或活动
 */
export const PUT = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      if (!context.hasPermission(ADMIN_PERMISSIONS.REWARD_MANAGE)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { type, id, ...updates } = body

      if (!id) {
        return NextResponse.json(
          { error: 'ID is required' },
          { status: 400 }
        )
      }

      let result
      switch (type) {
        case 'rule':
          result = await rewardConfigService.updateRewardRule(id, updates)
          break
        case 'activity':
          result = await rewardConfigService.updateRewardActivity(id, updates)
          break
        default:
          return NextResponse.json(
            { error: 'Invalid type parameter' },
            { status: 400 }
          )
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: `${type === 'rule' ? 'Reward rule' : 'Reward activity'} updated successfully`
      })
    } catch (error) {
      console.error('Update reward config error:', error)
      return NextResponse.json(
        { error: 'Failed to update reward configuration' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_MANAGE]
)

/**
 * 删除奖励规则或活动
 */
export const DELETE = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      if (!context.hasPermission(ADMIN_PERMISSIONS.REWARD_MANAGE)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(request.url)
      const type = searchParams.get('type')
      const id = searchParams.get('id')

      if (!type || !id) {
        return NextResponse.json(
          { error: 'Type and ID are required' },
          { status: 400 }
        )
      }

      switch (type) {
        case 'rule':
          await rewardConfigService.deleteRewardRule(id)
          break
        case 'activity':
          await rewardConfigService.deleteRewardActivity(id)
          break
        default:
          return NextResponse.json(
            { error: 'Invalid type parameter' },
            { status: 400 }
          )
      }

      return NextResponse.json({
        success: true,
        message: `${type === 'rule' ? 'Reward rule' : 'Reward activity'} deleted successfully`
      })
    } catch (error) {
      console.error('Delete reward config error:', error)
      return NextResponse.json(
        { error: 'Failed to delete reward configuration' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_MANAGE]
)