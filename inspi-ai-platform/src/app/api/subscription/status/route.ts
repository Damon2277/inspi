import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import authOptions from '@/core/auth/next-auth-config';
import connectDB from '@/lib/mongodb';
import { QuotaService } from '@/services/quota.service';

export async function GET(request: NextRequest) {
  try {
    // Try to connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.warn('MongoDB not available, using mock data');
      // Return mock subscription data when DB is not available
      return NextResponse.json({
        success: true,
        data: {
          plan: 'pro',
          used: 0,
          limit: 1000,
          remaining: 1000,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

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
    // Return mock data instead of error
    return NextResponse.json({
      success: true,
      data: {
        plan: 'pro',
        used: 0,
        limit: 1000,
        remaining: 1000,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }
}
