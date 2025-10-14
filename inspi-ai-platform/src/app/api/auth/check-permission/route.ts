import { NextRequest, NextResponse } from 'next/server';

import { permissionMiddleware } from '@/core/auth/permission-middleware';
import { QuotaType } from '@/shared/types/subscription';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, requiredPermissions, quotaType, quotaAmount } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 },
      );
    }

    // 检查权限
    const result = await permissionMiddleware.checkPermission({
      userId,
      requiredPermissions,
      quotaType: quotaType as QuotaType,
      quotaAmount,
    });

    return NextResponse.json({
      success: true,
      allowed: result.allowed,
      reason: result.reason,
      suggestedTier: result.suggestedTier,
      quotaUsed: result.quotaUsed,
      quotaLimit: result.quotaLimit,
    });

  } catch (error) {
    console.error('权限检查失败:', error);
    return NextResponse.json(
      { success: false, error: '权限检查失败' },
      { status: 500 },
    );
  }
}
