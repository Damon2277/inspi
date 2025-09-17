/**
 * 获取用户邀请奖励记录API
 * 支持时间段筛选和奖励类型筛选
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface RewardRecord {
  id: string
  rewardType: 'ai_credits' | 'badge' | 'title' | 'premium_access'
  amount?: number
  badgeName?: string
  titleName?: string
  description: string
  grantedAt: Date
  expiresAt?: Date
  sourceType: 'invite_registration' | 'invite_activation' | 'milestone'
  sourceDescription: string
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
    const rewardType = searchParams.get('type') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

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
        dateFilter = `AND r.granted_at >= '${weekAgo.toISOString()}'`
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = `AND r.granted_at >= '${monthAgo.toISOString()}'`
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        dateFilter = `AND r.granted_at >= '${quarterAgo.toISOString()}'`
        break
      default:
        dateFilter = ''
    }

    // 构建奖励类型筛选条件
    let typeFilter = ''
    if (rewardType !== 'all') {
      typeFilter = `AND r.reward_type = '${rewardType}'`
    }

    // 获取奖励记录
    const rewardsQuery = `
      SELECT 
        r.id,
        r.reward_type as rewardType,
        r.amount,
        r.badge_id as badgeId,
        r.title_id as titleId,
        r.description,
        r.granted_at as grantedAt,
        r.expires_at as expiresAt,
        r.source_type as sourceType,
        r.source_id as sourceId,
        b.name as badgeName,
        t.name as titleName,
        CASE 
          WHEN r.source_type = 'invite_registration' THEN '邀请注册奖励'
          WHEN r.source_type = 'invite_activation' THEN '邀请激活奖励'
          WHEN r.source_type = 'milestone' THEN '里程碑奖励'
          ELSE '其他奖励'
        END as sourceDescription
      FROM rewards r
      LEFT JOIN badges b ON b.id = r.badge_id
      LEFT JOIN titles t ON t.id = r.title_id
      WHERE r.user_id = ? 
        AND r.source_type IN ('invite_registration', 'invite_activation', 'milestone')
        ${dateFilter} ${typeFilter}
      ORDER BY r.granted_at DESC
      LIMIT ? OFFSET ?
    `

    const [rewardsResult] = await db.execute(rewardsQuery, [userId, limit, offset])

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM rewards r
      WHERE r.user_id = ? 
        AND r.source_type IN ('invite_registration', 'invite_activation', 'milestone')
        ${dateFilter} ${typeFilter}
    `

    const [countResult] = await db.execute(countQuery, [userId])
    const total = (countResult[0] as any).total

    const rewardRecords: RewardRecord[] = (rewardsResult as any[]).map(row => ({
      id: row.id,
      rewardType: row.rewardType,
      amount: row.amount,
      badgeName: row.badgeName,
      titleName: row.titleName,
      description: row.description,
      grantedAt: new Date(row.grantedAt),
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      sourceType: row.sourceType,
      sourceDescription: row.sourceDescription
    }))

    return NextResponse.json({
      success: true,
      data: rewardRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to get reward records:', error)
    return NextResponse.json(
      { error: 'Failed to get reward records' },
      { status: 500 }
    )
  }
}