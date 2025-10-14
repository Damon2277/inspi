/**
 * 用户登出API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import { AuthService } from '@/core/auth/auth-service';
import { extractTokenFromHeader } from '@/core/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '令牌不能为空' },
        { status: 400 },
      );
    }

    // 调用认证服务
    const result = await AuthService.logout(token);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
