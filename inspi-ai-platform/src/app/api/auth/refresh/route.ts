/**
 * 刷新令牌API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import { AuthService } from '@/core/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: '刷新令牌不能为空' },
        { status: 400 },
      );
    }

    // 调用认证服务
    const result = await AuthService.refreshToken({ refreshToken });

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 401 });
    }
  } catch (error) {
    console.error('Refresh token API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
