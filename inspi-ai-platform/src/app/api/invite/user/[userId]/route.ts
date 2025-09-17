/**
 * 获取用户邀请码信息API
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationServiceImpl } from '@/lib/invitation/services/InvitationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const invitationService = new InvitationServiceImpl(db)

/**
 * 获取用户的邀请码信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 获取用户的邀请码
    const inviteCodes = await invitationService.getUserInviteCodes(userId)
    
    if (inviteCodes.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No invite codes found'
      })
    }

    // 返回最新的邀请码
    const latestInviteCode = inviteCodes[0]
    
    // 构建邀请链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/${latestInviteCode.code}`

    const responseData = {
      ...latestInviteCode,
      inviteLink
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Failed to get user invite code:', error)
    return NextResponse.json(
      { error: 'Failed to get invite code' },
      { status: 500 }
    )
  }
}