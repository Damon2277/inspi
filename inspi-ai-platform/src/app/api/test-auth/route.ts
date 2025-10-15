import { NextResponse } from 'next/server';

import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  return NextResponse.json({
    success: true,
    message: '认证成功',
    user: {
      userId: request.user?.userId,
      email: request.user?.email,
    },
  });
});
