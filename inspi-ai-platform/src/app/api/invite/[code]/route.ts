/**
 * 邀请链接处理API
 * 处理 /api/invite/[code] 路由
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationServiceImpl } from '../../../../lib/invitation/services/InvitationService'
import { InviteRegistrationHandlerImpl } from '../../../../lib/invitation/services/InviteRegistrationHandler'
import { logger } from '../../../../lib/utils/logger'

// GET /api/invite/[code] - 验证邀请码并记录点击
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const invitationService = new InvitationServiceImpl()
    const registrationHandler = new InviteRegistrationHandlerImpl()

    // 记录邀请链接点击
    await registrationHandler.handleInviteLinkClick(code, ipAddress, userAgent)

    // 验证邀请码
    const validation = await invitationService.validateInviteCode(code)

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        errorCode: validation.errorCode
      }, { status: 400 })
    }

    // 返回邀请码信息（不包含敏感数据）
    return NextResponse.json({
      success: true,
      data: {
        code: validation.code?.code,
        isValid: true,
        expiresAt: validation.code?.expiresAt,
        usageCount: validation.code?.usageCount,
        maxUsage: validation.code?.maxUsage
      }
    })

  } catch (error) {
    logger.error('Failed to handle invite link', { code: params.code, error })
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/invite/[code] - 处理邀请注册
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const invitationService = new InvitationServiceImpl()
    const result = await invitationService.processInviteRegistration(code, userId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        registrationId: result.registration?.id,
        inviterId: result.registration?.inviterId,
        registeredAt: result.registration?.registeredAt
      }
    })

  } catch (error) {
    logger.error('Failed to process invite registration', { code: params.code, error })
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}