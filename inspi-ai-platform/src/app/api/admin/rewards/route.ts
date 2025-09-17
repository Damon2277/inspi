/**
 * 管理后台奖励管理API
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, ADMIN_PERMISSIONS } from '@/lib/invitation/middleware/AdminAuthMiddleware'
import { AdminServiceImpl } from '@/lib/invitation/services/AdminService'
import { DatabaseService } from '@/lib/invitation/database'
import { RewardType } from '@/lib/invitation/types'

const db = new DatabaseService()
const adminService = new AdminServiceImpl(db)

export const GET = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const userId = searchParams.get('userId') || undefined
      const type = searchParams.get('type') as RewardType | undefined
      
      // 日期范围过滤
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const dateRange = startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined

      const filters = {
        userId,
        type,
        dateRange
      }

      const rewardData = await adminService.getRewardManagement(page, limit, filters)
      
      return NextResponse.json({
        success: true,
        data: rewardData
      })
    } catch (error) {
      console.error('Reward management API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reward data' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_VIEW]
)

export const POST = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      if (!context.hasPermission(ADMIN_PERMISSIONS.REWARD_GRANT)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { userId, type, amount, description } = body

      // 验证必需字段
      if (!userId || !type || !amount) {
        return NextResponse.json(
          { error: 'Missing required fields: userId, type, amount' },
          { status: 400 }
        )
      }

      // 验证奖励类型
      const validTypes: RewardType[] = ['ai_credits', 'badge', 'title', 'premium_access']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid reward type' },
          { status: 400 }
        )
      }

      // 验证数量
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        )
      }

      await adminService.grantReward(userId, type, amount, description || '')

      return NextResponse.json({
        success: true,
        message: 'Reward granted successfully'
      })
    } catch (error) {
      console.error('Grant reward error:', error)
      return NextResponse.json(
        { error: 'Failed to grant reward' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_GRANT]
)

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
      const rewardId = searchParams.get('id')
      const reason = searchParams.get('reason') || 'Admin action'

      if (!rewardId) {
        return NextResponse.json(
          { error: 'Reward ID is required' },
          { status: 400 }
        )
      }

      await adminService.revokeReward(rewardId, reason)

      return NextResponse.json({
        success: true,
        message: 'Reward revoked successfully'
      })
    } catch (error) {
      console.error('Revoke reward error:', error)
      return NextResponse.json(
        { error: 'Failed to revoke reward' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_MANAGE]
)