/**
 * 奖励审核管理API
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, ADMIN_PERMISSIONS } from '@/lib/invitation/middleware/AdminAuthMiddleware'
import { RewardConfigServiceImpl } from '@/lib/invitation/services/RewardConfigService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const rewardConfigService = new RewardConfigServiceImpl()

/**
 * 获取待审核奖励列表
 */
export const GET = withAdminAuth(
  async (request: NextRequest, context) => {
    try {
      const approvals = await rewardConfigService.getPendingApprovals()

      return NextResponse.json({
        success: true,
        data: approvals
      })
    } catch (error) {
      console.error('Get pending approvals error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending approvals' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_VIEW]
)

/**
 * 审核奖励（批准或拒绝）
 */
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
      const { approvalId, action, notes, reason } = body

      if (!approvalId || !action) {
        return NextResponse.json(
          { error: 'Approval ID and action are required' },
          { status: 400 }
        )
      }

      if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json(
          { error: 'Invalid action. Must be "approve" or "reject"' },
          { status: 400 }
        )
      }

      const adminId = context.user.id

      if (action === 'approve') {
        await rewardConfigService.approveReward(approvalId, adminId, notes)
      } else {
        if (!reason) {
          return NextResponse.json(
            { error: 'Reason is required for rejection' },
            { status: 400 }
          )
        }
        await rewardConfigService.rejectReward(approvalId, adminId, reason)
      }

      return NextResponse.json({
        success: true,
        message: `Reward ${action}d successfully`
      })
    } catch (error) {
      console.error('Reward approval error:', error)
      return NextResponse.json(
        { error: 'Failed to process reward approval' },
        { status: 500 }
      )
    }
  },
  [ADMIN_PERMISSIONS.REWARD_GRANT]
)