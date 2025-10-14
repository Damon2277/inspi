/**
 * 订阅套餐API路由
 * 处理套餐查询、创建、更新等请求
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/core/auth/auth-service';
import { subscriptionManager } from '@/core/subscription/subscription-manager';
import { logger } from '@/shared/utils/logger';

/**
 * GET /api/subscription/plans
 * 获取所有可用套餐
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let plans = await subscriptionManager.getAvailablePlans();

    // 筛选条件
    if (tier) {
      plans = plans.filter(plan => plan.tier === tier);
    }

    if (activeOnly) {
      plans = plans.filter(plan => plan.active);
    }

    // 按排序顺序排列
    plans.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    logger.error('Failed to get subscription plans', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: '获取套餐列表失败',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/subscription/plans
 * 创建新套餐（管理员功能）
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

    // TODO: 实现管理员权限检查
    // 暂时跳过权限检查

    const planData = await request.json();

    // 验证必需字段
    const requiredFields = ['name', 'displayName', 'description', 'tier', 'monthlyPrice', 'quotas', 'features'];
    for (const field of requiredFields) {
      if (!planData[field]) {
        return NextResponse.json(
          { error: `${field} 字段不能为空` },
          { status: 400 },
        );
      }
    }

    // 验证套餐等级
    if (!['free', 'basic', 'pro', 'admin'].includes(planData.tier)) {
      return NextResponse.json(
        { error: '无效的套餐等级' },
        { status: 400 },
      );
    }

    // 验证价格
    if (planData.monthlyPrice < 0) {
      return NextResponse.json(
        { error: '价格不能为负数' },
        { status: 400 },
      );
    }

    // 创建套餐
    const plan = await subscriptionManager.createPlan(planData);

    logger.info('Subscription plan created', {
      planId: plan.id,
      createdBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    logger.error('Failed to create subscription plan', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建套餐失败',
      },
      { status: 500 },
    );
  }
}
