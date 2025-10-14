/**
 * 用户激活API
 * 处理 /api/invite/activate 路由
 */

import { NextRequest, NextResponse } from 'next/server';

import { InviteRegistrationHandlerImpl } from '../../../../lib/invitation/services/InviteRegistrationHandler';
import { logger } from '../../../../lib/utils/logger';

// POST /api/invite/activate - 激活用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    const registrationHandler = new InviteRegistrationHandlerImpl();
    const activated = await registrationHandler.activateUser(userId);

    if (!activated) {
      return NextResponse.json({
        success: false,
        error: 'No pending invite registration found for user',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'User activated successfully',
    });

  } catch (error) {
    logger.error('Failed to activate user', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

// GET /api/invite/activate?userId=xxx - 检查用户激活状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    const registrationHandler = new InviteRegistrationHandlerImpl();
    const registration = await registrationHandler.getUserInviteRegistration(userId);

    if (!registration) {
      return NextResponse.json({
        success: true,
        data: {
          isInvitedUser: false,
          isActivated: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isInvitedUser: true,
        isActivated: registration.isActivated,
        registeredAt: registration.registeredAt,
        activatedAt: registration.activatedAt,
        inviterId: registration.inviterId,
      },
    });

  } catch (error) {
    logger.error('Failed to check user activation status', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
