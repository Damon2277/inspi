/**
 * 批量删除通知API路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceImpl } from '@/lib/invitation/services/NotificationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const notificationService = new NotificationServiceImpl(db)

/**
 * 批量删除通知
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationIds } = body

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'Notification IDs array is required' },
        { status: 400 }
      )
    }

    // 验证通知ID格式
    const validIds = notificationIds.filter(id => typeof id === 'string' && id.length > 0)
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid notification IDs provided' },
        { status: 400 }
      )
    }

    // 删除通知
    const deletedCount = await deleteNotifications(validIds)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} notifications`,
      deletedCount
    })

  } catch (error) {
    console.error('Failed to delete notifications:', error)
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    )
  }
}

/**
 * 删除通知的实现
 */
async function deleteNotifications(notificationIds: string[]): Promise<number> {
  try {
    const placeholders = notificationIds.map(() => '?').join(',')
    const query = `
      DELETE FROM notifications 
      WHERE id IN (${placeholders})
    `
    
    const result = await db.execute(query, notificationIds)
    return result.affectedRows || 0
  } catch (error) {
    console.error('Failed to delete notifications from database:', error)
    throw new Error('Database operation failed')
  }
}