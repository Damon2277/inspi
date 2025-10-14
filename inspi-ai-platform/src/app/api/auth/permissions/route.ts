import { NextRequest, NextResponse } from 'next/server';

import { permissionMiddleware } from '@/core/auth/permission-middleware';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 },
      );
    }

    // 获取用户权限信息
    const permissions = await permissionMiddleware.getUserPermissions(userId);

    return NextResponse.json({
      success: true,
      ...permissions,
    });

  } catch (error) {
    console.error('获取用户权限失败:', error);
    return NextResponse.json(
      { success: false, error: '获取权限信息失败' },
      { status: 500 },
    );
  }
}
