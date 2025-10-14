/**
 * 验证会话API路由
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

    // 验证会话
    const result = await AuthService.validateSession(token);

    if (result.success) {
      return NextResponse.json(
        { success: true, user: result.user },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error('Validate session API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
