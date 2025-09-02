import { NextRequest, NextResponse } from 'next/server';
// 临时使用mock服务，直到MongoDB配置完成
import { loginUser } from '@/lib/auth/mock-service';
import { rateLimit } from '@/lib/auth/middleware';

/**
 * POST /api/auth/login
 * Login user
 */
export const POST = rateLimit(10, 15 * 60 * 1000)(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    const result = await loginUser({ email, password });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});