/**
 * 获取用户邀请历史记录API
 * 支持状态筛选和时间段筛选
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface InviteHistory {
  id: string
  inviteeId: string
  inviteeName: string
  inviteeEmail: string
  registeredAt: Date
  isActivated: boolean
  activatedAt?: Date
  status: 'pending' | 'activated' | 'inactive'
  rewardsClaimed: boolean
  lastActiveAt?: Date
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
    const status = searchParams.get('status') || 'all'
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

    // 构建状态筛选条件
    let statusFilter = ''
    switch (status) {
      case 'activated':
        statusFilter = 'AND ir.is_activated = true'
        break
      case 'pending':
        statusFilter = 'AND ir.is_activated = false AND ir.last_active_at IS NULL'
        break
      case 'inactive':
        statusFilter = 'AND ir.is_activated = false AND ir.last_active_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
        break
      default:
        statusFilter = ''
    }

    // 获取邀请历史记录
    const historyQuery = `
      SELECT 
        ir.id,
        ir.invitee_id as inviteeId,
        u.name as inviteeName,
        u.email as inviteeEmail,
        ir.registered_at as registeredAt,
        ir.is_activated as isActivated,
        ir.activated_at as activatedAt,
        ir.rewards_claimed as rewardsClaimed,
        ir.last_active_at as lastActiveAt,
        CASE 
          WHEN ir.is_activated = true THEN 'activated'
          WHEN ir.last_active_at IS NULL THEN 'pending'
          WHEN ir.last_active_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'inactive'
          ELSE 'pending'
        END as status
      FROM invite_registrations ir
      LEFT JOIN users u ON u.id = ir.invitee_id
      WHERE ir.inviter_id = ? ${dateFilter} ${statusFilter}
      ORDER BY ir.registered_at DESC
      LIMIT ? OFFSET ?
    `

    const [historyResult] = await db.execute(historyQuery, [userId, limit, offset])

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM invite_registrations ir
      WHERE ir.inviter_id = ? ${dateFilter} ${statusFilter}
    `

    const [countResult] = await db.execute(countQuery, [userId])
    const total = (countResult[0] as any).total

    const inviteHistory: InviteHistory[] = (historyResult as any[]).map(row => ({
      id: row.id,
      inviteeId: row.inviteeId,
      inviteeName: row.inviteeName || '未知用户',
      inviteeEmail: row.inviteeEmail || '',
      registeredAt: new Date(row.registeredAt),
      isActivated: Boolean(row.isActivated),
      activatedAt: row.activatedAt ? new Date(row.activatedAt) : undefined,
      status: row.status,
      rewardsClaimed: Boolean(row.rewardsClaimed),
      lastActiveAt: row.lastActiveAt ? new Date(row.lastActiveAt) : undefined
    }))

    return NextResponse.json({
      success: true,
      data: inviteHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to get invitation history:', error)
    return NextResponse.json(
      { error: 'Failed to get invitation history' },
      { status: 500 }
    )
  }
}