/**
 * 批量标记通知为已读API路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceImpl } from '@/lib/invitation/services/NotificationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const notificationService = new NotificationServiceImpl(db)

/**
 * 批量标记通知为已读
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationIds } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Notification IDs array is required' },
        { status: 400 }
      )
    }

    await notificationService.markMultipleAsRead(notificationIds)

    return NextResponse.json({
      success: true,
      message: `${notificationIds.length} notifications marked as read`
    })

  } catch (error) {
    console.error('Failed to mark notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}