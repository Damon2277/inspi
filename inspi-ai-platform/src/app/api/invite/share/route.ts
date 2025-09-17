/**
 * 记录邀请分享事件API
 */

import { NextRequest, NextResponse } from 'next/server'
import { ShareTrackingServiceImpl } from '@/lib/invitation/services/ShareTrackingService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const shareTrackingService = new ShareTrackingServiceImpl(db)

/**
 * 记录邀请分享事件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inviteCodeId, platform, userId } = body

    if (!inviteCodeId || !platform || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 记录分享事件
    await shareTrackingService.trackShareEvent({
      inviteCodeId,
      platform,
      userId,
      timestamp: new Date(),
      metadata: {
        userAgent: request.headers.get('user-agent') || '',
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Share event recorded successfully'
    })

  } catch (error) {
    console.error('Failed to record share event:', error)
    return NextResponse.json(
      { error: 'Failed to record share event' },
      { status: 500 }
    )
  }
}