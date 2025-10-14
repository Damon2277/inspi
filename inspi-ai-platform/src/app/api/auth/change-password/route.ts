import { NextRequest, NextResponse } from 'next/server';

import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';
import { changePassword } from '@/core/auth/service';

/**
 * POST /api/auth/change-password
 * Change user password
 */
export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 },
      );
    }

    const result = await changePassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
});
