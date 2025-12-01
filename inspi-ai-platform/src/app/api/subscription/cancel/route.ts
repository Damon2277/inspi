import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { DEMO_USER_ID } from '@/core/auth/constants';
import authOptions from '@/core/auth/next-auth-config';
import connectDB from '@/lib/mongodb';
import { SubscriptionLog } from '@/models/subscription';
import { QuotaService } from '@/services/quota.service';

export async function POST(request: NextRequest) {
  try {
    // 连接数据库
    await connectDB();

    // 获取用户信息
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id || DEMO_USER_ID;

    // 取消订阅
    const subscription = await QuotaService.cancelSubscription(userId);

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found',
        },
        { status: 400 },
      );
    }

    // 记录日志
    await SubscriptionLog.create({
      userId,
      subscriptionId: subscription._id.toString(),
      action: 'cancel',
      previousStatus: 'active',
      newStatus: 'cancelled',
      details: {
        reason: 'User cancelled',
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: '订阅已取消，当前周期结束后将不再续费',
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error: any) {
    console.error('POST /api/subscription/cancel error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cancel subscription',
      },
      { status: 500 },
    );
  }
}
