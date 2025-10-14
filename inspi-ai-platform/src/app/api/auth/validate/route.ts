/**
 * 验证会话API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import { verifyToken } from '@/core/auth/jwt';

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

function extractTokenFromHeader(authHeader: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

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

    try {
      // 验证JWT令牌
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.email) {
        return NextResponse.json(
          { success: false, error: '无效的会话' },
          { status: 401 },
        );
      }

      // 开发环境：如果是demo用户，直接返回模拟数据
      if (process.env.NODE_ENV === 'development' && 
          process.env.DEMO_LOGIN_ENABLED === 'true' &&
          decoded.email === 'demo@example.com') {
        return NextResponse.json(
          { 
            success: true, 
            user: DEMO_USER 
          },
          { status: 200 },
        );
      }

      // 生产环境：连接数据库验证
      try {
        const { AuthService } = await import('@/core/auth/auth-service');
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
      } catch (dbError) {
        // 如果数据库连接失败，在开发环境返回模拟用户
        if (process.env.NODE_ENV === 'development') {
          console.warn('Database connection failed, using demo user');
          return NextResponse.json(
            { 
              success: true, 
              user: { ...DEMO_USER, email: decoded.email } 
            },
            { status: 200 },
          );
        }
        throw dbError;
      }
    } catch (error: any) {
      console.error('Token verification error:', error.message);
      return NextResponse.json(
        { success: false, error: '会话已过期，请重新登录' },
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