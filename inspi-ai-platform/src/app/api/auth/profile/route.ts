import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/mock-service';

/**
 * GET /api/auth/profile
 * Get user profile
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Using mock profile service');
    
    // 简化的身份验证（检查是否有token）
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 从token中解析用户ID（简化版本）
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const userId = payload.userId;
      
      const result = await getUserProfile(userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: result.user,
      });
    } catch (tokenError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Get profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/profile
 * Update user profile
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔧 Using mock profile update service');
    
    // 简化的身份验证（检查是否有token）
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, profile, settings } = body;

    // 模拟更新用户资料
    const updatedUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: name || 'Test User',
      profile: profile || {},
      settings: settings || {
        emailNotifications: true,
        publicProfile: false,
      },
      subscription: {
        plan: 'free',
        startDate: new Date(),
        isActive: true,
      },
      usage: {
        dailyGenerations: 0,
        dailyReuses: 0,
        lastResetDate: new Date(),
      },
    };

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}