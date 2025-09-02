import { NextRequest, NextResponse } from 'next/server';
// 临时使用mock服务，直到MongoDB配置完成
import { registerUser } from '@/lib/auth/mock-service';
import { rateLimit } from '@/lib/auth/middleware';

/**
 * POST /api/auth/register
 * Register a new user
 */
export const POST = rateLimit(5, 15 * 60 * 1000)(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    const result = await registerUser({ email, password, name });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Registration successful',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});