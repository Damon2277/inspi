/**
 * 用户登录API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import { generateToken, generateRefreshToken } from '@/core/auth/jwt';

// 模拟用户数据（用于开发测试）
const DEMO_USER = {
  id: 'demo-user-id',
  _id: 'demo-user-id',
  email: 'demo@example.com',
  name: 'Demo User',
  username: 'demouser',
  emailVerified: true,
  emailVerifiedAt: new Date(),
  subscription: {
    plan: 'pro',
    tier: 'premium',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
  roles: ['user'],
  permissions: ['user.access'],
  usage: {
    dailyGenerations: 0,
    dailyReuses: 0,
    lastResetDate: new Date(),
  },
  settings: {
    emailNotifications: true,
    publicProfile: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

    // 开发环境Demo登录
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.DEMO_LOGIN_ENABLED === 'true' &&
      email === process.env.DEMO_LOGIN_EMAIL &&
      password === process.env.DEMO_LOGIN_PASSWORD
    ) {
      // 生成JWT令牌
      const token = generateToken({ email, userId: DEMO_USER.id });
      const refreshToken = generateRefreshToken({ email, userId: DEMO_USER.id });

      return NextResponse.json(
        {
          success: true,
          user: DEMO_USER,
          token,
          refreshToken,
          message: '登录成功（Demo模式）',
        },
        { status: 200 },
      );
    }

    // 生产环境：连接数据库验证
    try {
      const { AuthService } = await import('@/core/auth/auth-service');
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
    } catch (dbError: any) {
      // 如果数据库连接失败，在开发环境提供友好提示
      if (process.env.NODE_ENV === 'development') {
        console.error('Database connection failed:', dbError.message);
        
        // 如果是尝试使用demo账号，提供正确的凭据提示
        if (email === 'demo@example.com' || email === process.env.DEMO_LOGIN_EMAIL) {
          return NextResponse.json(
            {
              success: false,
              error: `数据库未连接。请使用以下测试账号：\n邮箱: ${process.env.DEMO_LOGIN_EMAIL}\n密码: ${process.env.DEMO_LOGIN_PASSWORD}`,
            },
            { status: 401 },
          );
        }
        
        return NextResponse.json(
          {
            success: false,
            error: 'MongoDB未启动。请使用demo账号登录或启动MongoDB服务。',
          },
          { status: 500 },
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}