/**
 * 获取用户邀请统计API
 */

import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsServiceImpl } from '@/lib/invitation/services/AnalyticsService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const analyticsService = new AnalyticsServiceImpl(db)

/**
 * 获取用户的邀请统计信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 获取用户邀请统计
    const stats = await analyticsService.getUserInviteStats(userId)

    // 计算转化率
    const conversionRate = stats.totalInvites > 0 
      ? stats.successfulRegistrations / stats.totalInvites 
      : 0

    const responseData = {
      totalInvites: stats.totalInvites,
      successfulRegistrations: stats.successfulRegistrations,
      activeInvitees: stats.activeInvitees,
      totalRewardsEarned: stats.totalRewardsEarned,
      conversionRate
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Failed to get user invite stats:', error)
    return NextResponse.json(
      { error: 'Failed to get invite stats' },
      { status: 500 }
    )
  }
}