/**
 * 通知管理API路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceImpl, NotificationChannel, NotificationStatus } from '@/lib/invitation/services/NotificationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const notificationService = new NotificationServiceImpl(db)

/**
 * 获取用户通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const channel = searchParams.get('channel') as NotificationChannel
    const status = searchParams.get('status') as NotificationStatus
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 构建查询选项
    const options: any = { limit, offset }
    if (channel) options.channel = channel
    if (status) options.status = status

    // 如果有搜索条件，使用自定义查询
    let notifications
    let total = 0

    if (search) {
      const result = await searchNotifications(userId, search, options)
      notifications = result.notifications
      total = result.total
    } else {
      notifications = await notificationService.getUserNotifications(userId, options)
      total = await getTotalNotifications(userId, options)
    }

    const unreadCount = await notificationService.getUnreadCount(userId, channel)

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total,
        pagination: {
          limit,
          offset,
          hasMore: notifications.length === limit
        }
      }
    })

  } catch (error) {
    console.error('Failed to get notifications:', error)
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    )
  }
}

/**
 * 发送通知
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, content, channel, metadata } = body

    if (!userId || !type || !title || !content || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const notificationId = await notificationService.sendNotification({
      userId,
      type,
      title,
      content,
      channel,
      status: NotificationStatus.PENDING,
      metadata
    })

    return NextResponse.json({
      success: true,
      data: { notificationId }
    })

  } catch (error) {
    console.error('Failed to send notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

/**
 * 搜索通知
 */
async function searchNotifications(userId: string, search: string, options: any) {
  try {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)
    `
    const params: any[] = [userId, `%${search}%`, `%${search}%`]

    if (options.channel) {
      query += ' AND channel = ?'
      params.push(options.channel)
    }

    if (options.status) {
      query += ' AND status = ?'
      params.push(options.status)
    }

    // 获取总数
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = await db.queryOne(countQuery, params)
    const total = parseInt(countResult?.total) || 0

    // 添加排序和分页
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(options.limit, options.offset)

    const results = await db.query(query, params)
    const notifications = results.map(mapToNotificationMessage)

    return { notifications, total }
  } catch (error) {
    console.error('Failed to search notifications:', error)
    throw new Error('Failed to search notifications')
  }
}

/**
 * 获取通知总数
 */
async function getTotalNotifications(userId: string, options: any): Promise<number> {
  try {
    let query = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?'
    const params: any[] = [userId]

    if (options.channel) {
      query += ' AND channel = ?'
      params.push(options.channel)
    }

    if (options.status) {
      query += ' AND status = ?'
      params.push(options.status)
    }

    const result = await db.queryOne(query, params)
    return parseInt(result?.total) || 0
  } catch (error) {
    console.error('Failed to get total notifications:', error)
    return 0
  }
}

/**
 * 映射数据库记录到通知消息对象
 */
function mapToNotificationMessage(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    channel: row.channel,
    status: row.status,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
    sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
    readAt: row.read_at ? new Date(row.read_at) : undefined,
    createdAt: new Date(row.created_at)
  }
}