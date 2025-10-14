/**
 * 用户登录API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import { AuthService } from '@/core/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '邮箱和密码不能为空' },
        { status: 400 },
      );
    }

    // 调用认证服务
    const result = await AuthService.login({
      email,
      password,
      rememberMe,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 401 });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
