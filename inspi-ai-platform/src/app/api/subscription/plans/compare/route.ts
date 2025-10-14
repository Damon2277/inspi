import { NextRequest, NextResponse } from 'next/server';

import { planService } from '@/core/subscription/plan-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planIds } = body;

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要对比的套餐ID列表' },
        { status: 400 },
      );
    }

    if (planIds.length > 5) {
      return NextResponse.json(
        { success: false, error: '最多只能对比5个套餐' },
        { status: 400 },
      );
    }

    // 执行套餐对比
    const result = await planService.comparePlans(planIds);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('套餐对比失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '套餐对比失败',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planIds = searchParams.get('planIds');

    if (!planIds) {
      return NextResponse.json(
        { success: false, error: '请提供要对比的套餐ID列表' },
        { status: 400 },
      );
    }

    const planIdArray = planIds.split(',').filter(id => id.trim());

    if (planIdArray.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供有效的套餐ID列表' },
        { status: 400 },
      );
    }

    if (planIdArray.length > 5) {
      return NextResponse.json(
        { success: false, error: '最多只能对比5个套餐' },
        { status: 400 },
      );
    }

    // 执行套餐对比
    const result = await planService.comparePlans(planIdArray);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('套餐对比失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '套餐对比失败',
      },
      { status: 500 },
    );
  }
}
