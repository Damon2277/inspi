/**
 * 获取邀请排行榜API
 * 支持时间段筛选和排名限制
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  totalInvites: number
  successfulRegistrations: number
  conversionRate: number
  totalRewards: number
  badges: string[]
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

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

    // 获取排行榜数据
    const leaderboardQuery = `
      SELECT 
        ir.inviter_id as userId,
        u.name as userName,
        u.avatar as userAvatar,
        COUNT(DISTINCT ir.id) as totalInvites,
        COUNT(DISTINCT CASE WHEN ir.is_activated = true THEN ir.id END) as successfulRegistrations,
        COALESCE(SUM(r.amount), 0) as totalRewards
      FROM invite_registrations ir
      LEFT JOIN users u ON u.id = ir.inviter_id
      LEFT JOIN rewards r ON r.user_id = ir.inviter_id AND r.source_type IN ('invite_registration', 'invite_activation')
      WHERE 1=1 ${dateFilter}
      GROUP BY ir.inviter_id, u.name, u.avatar
      HAVING totalInvites > 0
      ORDER BY successfulRegistrations DESC, totalInvites DESC
      LIMIT ?
    `

    const [leaderboardResult] = await db.execute(leaderboardQuery, [limit])

    // 获取用户徽章信息
    const userIds = (leaderboardResult as any[]).map(row => row.userId)
    let badgesMap: Record<string, string[]> = {}

    if (userIds.length > 0) {
      const badgesQuery = `
        SELECT 
          r.user_id as userId,
          b.name as badgeName
        FROM rewards r
        LEFT JOIN badges b ON b.id = r.badge_id
        WHERE r.user_id IN (${userIds.map(() => '?').join(',')}) 
          AND r.reward_type = 'badge'
          AND b.name IS NOT NULL
        ORDER BY r.granted_at DESC
      `

      const [badgesResult] = await db.execute(badgesQuery, userIds)
      
      // 组织徽章数据
      badgesMap = (badgesResult as any[]).reduce((acc, row) => {
        if (!acc[row.userId]) {
          acc[row.userId] = []
        }
        if (!acc[row.userId].includes(row.badgeName)) {
          acc[row.userId].push(row.badgeName)
        }
        return acc
      }, {} as Record<string, string[]>)
    }

    const leaderboard: LeaderboardEntry[] = (leaderboardResult as any[]).map((row, index) => {
      const conversionRate = row.totalInvites > 0 ? row.successfulRegistrations / row.totalInvites : 0
      
      return {
        rank: index + 1,
        userId: row.userId,
        userName: row.userName || '未知用户',
        userAvatar: row.userAvatar,
        totalInvites: row.totalInvites,
        successfulRegistrations: row.successfulRegistrations,
        conversionRate,
        totalRewards: row.totalRewards,
        badges: badgesMap[row.userId] || []
      }
    })

    return NextResponse.json({
      success: true,
      data: leaderboard
    })

  } catch (error) {
    console.error('Failed to get leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    )
  }
}