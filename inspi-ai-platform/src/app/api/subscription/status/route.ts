import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import authOptions from '@/core/auth/next-auth-config';
import connectDB from '@/lib/mongodb';
import { QuotaService } from '@/services/quota.service';

export async function GET(request: NextRequest) {
  try {
    // 连接数据库
    await connectDB();

    // 获取用户信息
    const session = await getServerSession(authOptions);

    const userId = (session?.user as { id?: string } | undefined)?.id || 'demo-user-id';

    // 获取额度状态
    const quotaStatus = await QuotaService.getQuotaStatus(userId);

    return NextResponse.json({
      success: true,
      data: quotaStatus,
    });
  } catch (error: any) {
    console.error('GET /api/subscription/status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get subscription status',
      },
      { status: 500 },
    );
  }
}
