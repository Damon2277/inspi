import { NextRequest, NextResponse } from 'next/server';

import { planService } from '@/core/subscription/plan-service';

export async function GET(request: NextRequest) {
  try {
    // 获取套餐统计信息
    const statistics = await planService.getPlanStatistics();

    return NextResponse.json({
      success: true,
      statistics,
    });

  } catch (error) {
    console.error('获取套餐统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取套餐统计失败' },
      { status: 500 },
    );
  }
}
