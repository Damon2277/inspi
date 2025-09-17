/**
 * 通知偏好设置API路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceImpl } from '@/lib/invitation/services/NotificationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const notificationService = new NotificationServiceImpl(db)

/**
 * 获取用户通知偏好设置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const preferences = await notificationService.getUserPreferences(userId)

    return NextResponse.json({
      success: true,
      data: preferences
    })

  } catch (error) {
    console.error('Failed to get notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * 更新用户通知偏好设置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, preferences } = body

    if (!userId || !preferences || !Array.isArray(preferences)) {
      return NextResponse.json(
        { error: 'User ID and preferences array are required' },
        { status: 400 }
      )
    }

    await notificationService.updateUserPreferences(userId, preferences)

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    console.error('Failed to update notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}