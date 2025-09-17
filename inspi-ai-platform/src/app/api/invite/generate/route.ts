/**
 * 生成邀请码API
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationServiceImpl } from '@/lib/invitation/services/InvitationService'
import { DatabaseService } from '@/lib/invitation/database'

const db = new DatabaseService()
const invitationService = new InvitationServiceImpl(db)

/**
 * 生成新的邀请码
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 生成新的邀请码
    const inviteCode = await invitationService.generateInviteCode(userId)
    
    // 构建邀请链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/${inviteCode.code}`

    const responseData = {
      ...inviteCode,
      inviteLink
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Invite code generated successfully'
    })

  } catch (error) {
    console.error('Failed to generate invite code:', error)
    return NextResponse.json(
      { error: 'Failed to generate invite code' },
      { status: 500 }
    )
  }
}