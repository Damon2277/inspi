/**
 * 取消订阅API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import connectDB from '@/lib/mongodb';
import { SubscriptionError } from '@/types/subscription';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // 验证用户身份
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as any;
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // 取消订阅
    const subscription = await SubscriptionService.cancelSubscription(userId);

    const responseData = {
      success: true,
      message: '订阅已成功取消',
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew,
        paymentMethod: subscription.paymentMethod
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Cancel subscription error:', error);

    if (error instanceof SubscriptionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}