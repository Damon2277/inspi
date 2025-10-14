/**
 * 创建订阅API路由
 * 处理订阅创建和支付流程
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/core/auth/auth-service';
import { paymentService } from '@/core/subscription/payment-service';
import { subscriptionManager } from '@/core/subscription/subscription-manager';
import { logger } from '@/shared/utils/logger';

/**
 * POST /api/subscription/create
 * 创建新订阅
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { planId, billingCycle = 'monthly', paymentMethod = 'wechat_pay', couponCode } = body;

    // 验证请求参数
    if (!planId) {
      return NextResponse.json(
        { error: '套餐ID不能为空' },
        { status: 400 },
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: '无效的计费周期' },
        { status: 400 },
      );
    }

    if (!['wechat_pay'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: '不支持的支付方式' },
        { status: 400 },
      );
    }

    // 创建订阅请求
    const createRequest = {
      userId: session.user.email,
      planId,
      billingCycle,
      paymentMethod,
      couponCode,
    };

    // 创建订阅
    const result = await subscriptionManager.createSubscription(createRequest);

    logger.info('Subscription creation initiated', {
      subscriptionId: result.subscription.id,
      userId: session.user.email,
      planId,
      paymentRequired: result.paymentRequired,
    });

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      paymentRequired: result.paymentRequired,
      paymentInfo: result.paymentInfo,
    });
  } catch (error) {
    logger.error('Failed to create subscription', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建订阅失败',
      },
      { status: 500 },
    );
  }
}
