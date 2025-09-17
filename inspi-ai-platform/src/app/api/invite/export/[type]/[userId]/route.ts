/**
 * 导出邀请数据API
 * 支持导出邀请历史和奖励记录为CSV格式
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, userId } = params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'

    // 验证用户权限
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 验证导出类型
    if (!['history', 'rewards'].includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // 构建时间筛选条件
    let dateFilter = ''
    const now = new Date()
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = type === 'history' 
          ? `AND ir.registered_at >= '${weekAgo.toISOString()}'`
          : `AND r.granted_at >= '${weekAgo.toISOString()}'`
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = type === 'history'
          ? `AND ir.registered_at >= '${monthAgo.toISOString()}'`
          : `AND r.granted_at >= '${monthAgo.toISOString()}'`
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        dateFilter = type === 'history'
          ? `AND ir.registered_at >= '${quarterAgo.toISOString()}'`
          : `AND r.granted_at >= '${quarterAgo.toISOString()}'`
        break
      default:
        dateFilter = ''
    }

    let csvContent = ''
    let filename = ''

    if (type === 'history') {
      // 导出邀请历史
      const historyQuery = `
        SELECT 
          ir.id,
          u.name as inviteeName,
          u.email as inviteeEmail,
          ir.registered_at as registeredAt,
          ir.is_activated as isActivated,
          ir.activated_at as activatedAt,
          ir.rewards_claimed as rewardsClaimed,
          ir.last_active_at as lastActiveAt,
          CASE 
            WHEN ir.is_activated = true THEN '已激活'
            WHEN ir.last_active_at IS NULL THEN '待激活'
            WHEN ir.last_active_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN '未激活'
            ELSE '待激活'
          END as status
        FROM invite_registrations ir
        LEFT JOIN users u ON u.id = ir.invitee_id
        WHERE ir.inviter_id = ? ${dateFilter}
        ORDER BY ir.registered_at DESC
      `

      const [historyResult] = await db.execute(historyQuery, [userId])

      // 构建CSV内容
      csvContent = '邀请ID,被邀请人姓名,邮箱,注册时间,激活状态,激活时间,奖励状态,最后活跃时间,状态\n'
      
      for (const row of historyResult as any[]) {
        const registeredAt = new Date(row.registeredAt).toLocaleString('zh-CN')
        const activatedAt = row.activatedAt ? new Date(row.activatedAt).toLocaleString('zh-CN') : ''
        const lastActiveAt = row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleString('zh-CN') : ''
        const isActivated = row.isActivated ? '是' : '否'
        const rewardsClaimed = row.rewardsClaimed ? '已领取' : '未领取'
        
        csvContent += `"${row.id}","${row.inviteeName || ''}","${row.inviteeEmail || ''}","${registeredAt}","${isActivated}","${activatedAt}","${rewardsClaimed}","${lastActiveAt}","${row.status}"\n`
      }

      filename = `invitation-history-${new Date().toISOString().split('T')[0]}.csv`

    } else if (type === 'rewards') {
      // 导出奖励记录
      const rewardsQuery = `
        SELECT 
          r.id,
          r.reward_type as rewardType,
          r.amount,
          r.description,
          r.granted_at as grantedAt,
          r.expires_at as expiresAt,
          r.source_type as sourceType,
          b.name as badgeName,
          t.name as titleName,
          CASE 
            WHEN r.source_type = 'invite_registration' THEN '邀请注册奖励'
            WHEN r.source_type = 'invite_activation' THEN '邀请激活奖励'
            WHEN r.source_type = 'milestone' THEN '里程碑奖励'
            ELSE '其他奖励'
          END as sourceDescription,
          CASE 
            WHEN r.reward_type = 'ai_credits' THEN 'AI生成次数'
            WHEN r.reward_type = 'badge' THEN '徽章'
            WHEN r.reward_type = 'title' THEN '称号'
            WHEN r.reward_type = 'premium_access' THEN '高级权限'
            ELSE '其他'
          END as rewardTypeName
        FROM rewards r
        LEFT JOIN badges b ON b.id = r.badge_id
        LEFT JOIN titles t ON t.id = r.title_id
        WHERE r.user_id = ? 
          AND r.source_type IN ('invite_registration', 'invite_activation', 'milestone')
          ${dateFilter}
        ORDER BY r.granted_at DESC
      `

      const [rewardsResult] = await db.execute(rewardsQuery, [userId])

      // 构建CSV内容
      csvContent = '奖励ID,奖励类型,数量,徽章名称,称号名称,描述,获得时间,过期时间,来源类型,来源描述\n'
      
      for (const row of rewardsResult as any[]) {
        const grantedAt = new Date(row.grantedAt).toLocaleString('zh-CN')
        const expiresAt = row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : ''
        const amount = row.amount || ''
        const badgeName = row.badgeName || ''
        const titleName = row.titleName || ''
        
        csvContent += `"${row.id}","${row.rewardTypeName}","${amount}","${badgeName}","${titleName}","${row.description}","${grantedAt}","${expiresAt}","${row.sourceDescription}","${row.sourceDescription}"\n`
      }

      filename = `invitation-rewards-${new Date().toISOString().split('T')[0]}.csv`
    }

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    // 添加BOM以支持Excel正确显示中文
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, { headers })

  } catch (error) {
    console.error('Failed to export data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}