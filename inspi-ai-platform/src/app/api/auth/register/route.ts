/**
 * 用户注册API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import { AuthService } from '@/core/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword, name } = body;

    // 验证输入
    if (!email || !password || !confirmPassword || !name) {
      return NextResponse.json(
        { success: false, error: '所有字段都是必填的' },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: '两次输入的密码不一致' },
        { status: 400 },
      );
    }

    // 调用认证服务
    const result = await AuthService.register({
      email,
      password,
      confirmPassword,
      name,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
