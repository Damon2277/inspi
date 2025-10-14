import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 简化的用户资料获取
    return NextResponse.json({
      success: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'free',
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '获取用户资料失败',
    }, { status: 500 });
  }
}
