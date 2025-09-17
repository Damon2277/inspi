/**
 * 获取用户详细邀请统计数据API
 * 支持时间段筛选和详细统计指标
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface DetailedStats {
  totalInvites: number
  successfulRegistrations: number
  activeInvitees: number
  totalRewardsEarned: number
  conversionRate: number
  averageActivationTime: number
  monthlyGrowth: number
  topPerformingPeriod: string
  recentActivity: {
    newRegistrations: number
    newActivations: number
    rewardsEarned: number
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'

    // 验证用户权限
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 构建时间筛选条件
    let dateFilter = ''
    const now = new Date()
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = `AND ir.registered_at >= '${weekAgo.toISOString()}'`
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = `AND ir.registered_at >= '${monthAgo.toISOString()}'`
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        dateFilter = `AND ir.registered_at >= '${quarterAgo.toISOString()}'`
        break
      default:
        dateFilter = ''
    }

    // 获取基础统计数据
    const basicStatsQuery = `
      SELECT 
        COUNT(DISTINCT ir.id) as total_invites,
        COUNT(DISTINCT CASE WHEN ir.is_activated = true THEN ir.id END) as successful_registrations,
        COUNT(DISTINCT CASE WHEN ir.is_activated = true AND ir.last_active_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN ir.id END) as active_invitees,
        COALESCE(SUM(r.amount), 0) as total_rewards_earned
      FROM invite_registrations ir
      LEFT JOIN rewards r ON r.user_id = ir.inviter_id AND r.source_type IN ('invite_registration', 'invite_activation')
      WHERE ir.inviter_id = ? ${dateFilter}
    `

    const [basicStats] = await db.execute(basicStatsQuery, [userId])
    const stats = basicStats[0] as any

    // 计算转化率
    const conversionRate = stats.total_invites > 0 ? stats.successful_registrations / stats.total_invites : 0

    // 计算平均激活时间
    const activationTimeQuery = `
      SELECT AVG(TIMESTAMPDIFF(HOUR, ir.registered_at, ir.activated_at)) as avg_activation_hours
      FROM invite_registrations ir
      WHERE ir.inviter_id = ? AND ir.is_activated = true AND ir.activated_at IS NOT NULL ${dateFilter}
    `

    const [activationTimeResult] = await db.execute(activationTimeQuery, [userId])
    const averageActivationTime = (activationTimeResult[0] as any)?.avg_activation_hours || 0

    // 计算月增长率
    const monthlyGrowthQuery = `
      SELECT 
        COUNT(CASE WHEN ir.registered_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as current_month,
        COUNT(CASE WHEN ir.registered_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) AND ir.registered_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as previous_month
      FROM invite_registrations ir
      WHERE ir.inviter_id = ?
    `

    const [growthResult] = await db.execute(monthlyGrowthQuery, [userId])
    const growth = growthResult[0] as any
    const monthlyGrowth = growth.previous_month > 0 ? 
      (growth.current_month - growth.previous_month) / growth.previous_month : 0

    // 获取最佳表现期
    const topPeriodQuery = `
      SELECT 
        DATE_FORMAT(ir.registered_at, '%Y-%m') as period,
        COUNT(*) as registrations
      FROM invite_registrations ir
      WHERE ir.inviter_id = ? AND ir.registered_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(ir.registered_at, '%Y-%m')
      ORDER BY registrations DESC
      LIMIT 1
    `

    const [topPeriodResult] = await db.execute(topPeriodQuery, [userId])
    const topPerformingPeriod = topPeriodResult.length > 0 ? 
      (topPeriodResult[0] as any).period : '暂无数据'

    // 获取近期活动数据
    const recentActivityQuery = `
      SELECT 
        COUNT(CASE WHEN ir.registered_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) THEN 1 END) as new_registrations,
        COUNT(CASE WHEN ir.activated_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) THEN 1 END) as new_activations,
        COALESCE(SUM(CASE WHEN r.granted_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) THEN r.amount ELSE 0 END), 0) as rewards_earned
      FROM invite_registrations ir
      LEFT JOIN rewards r ON r.user_id = ir.inviter_id AND r.source_type IN ('invite_registration', 'invite_activation')
      WHERE ir.inviter_id = ?
    `

    const [recentActivityResult] = await db.execute(recentActivityQuery, [userId])
    const recentActivity = recentActivityResult[0] as any

    const detailedStats: DetailedStats = {
      totalInvites: stats.total_invites,
      successfulRegistrations: stats.successful_registrations,
      activeInvitees: stats.active_invitees,
      totalRewardsEarned: stats.total_rewards_earned,
      conversionRate,
      averageActivationTime,
      monthlyGrowth,
      topPerformingPeriod,
      recentActivity: {
        newRegistrations: recentActivity.new_registrations,
        newActivations: recentActivity.new_activations,
        rewardsEarned: recentActivity.rewards_earned
      }
    }

    return NextResponse.json({
      success: true,
      data: detailedStats
    })

  } catch (error) {
    console.error('Failed to get detailed invitation stats:', error)
    return NextResponse.json(
      { error: 'Failed to get detailed invitation stats' },
      { status: 500 }
    )
  }
}