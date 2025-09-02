/**
 * 订阅升级API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import connectDB from '@/lib/mongodb';
import { SubscriptionPlan, PaymentMethod, SubscriptionError } from '@/types/subscription';

interface UpgradeRequest {
  plan: SubscriptionPlan;
  billingCycle?: 'monthly' | 'yearly';
  paymentMethod?: PaymentMethod;
}

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

    // 解析请求体
    const body: UpgradeRequest = await request.json();
    const { plan, billingCycle = 'monthly', paymentMethod = 'wechat' } = body;

    // 验证计划类型
    if (!['free', 'pro', 'super'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // 验证计费周期
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    // 创建或升级订阅
    const subscription = await SubscriptionService.createSubscription(
      userId,
      plan,
      billingCycle,
      paymentMethod
    );

    // 获取更新后的使用情况
    const todayUsage = await SubscriptionService.getTodayUsage(userId);

    const responseData = {
      success: true,
      message: `成功${plan === 'free' ? '切换到' : '升级到'}${plan.toUpperCase()}计划`,
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew,
        paymentMethod: subscription.paymentMethod
      },
      usage: {
        date: todayUsage.date,
        generations: {
          current: todayUsage.generations,
          limit: todayUsage.limits.maxGenerations,
          remaining: Math.max(0, todayUsage.limits.maxGenerations - todayUsage.generations)
        },
        reuses: {
          current: todayUsage.reuses,
          limit: todayUsage.limits.maxReuses,
          remaining: Math.max(0, todayUsage.limits.maxReuses - todayUsage.reuses)
        }
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Subscription upgrade error:', error);

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